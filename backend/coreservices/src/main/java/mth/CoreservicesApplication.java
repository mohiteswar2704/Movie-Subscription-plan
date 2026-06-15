package mth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import mth.models.Menus;
import mth.models.Roles;
import mth.models.Rolesmapping;
import mth.models.RolesmappingId;
import mth.models.Users;
import mth.repository.MenusRepository;
import mth.repository.RolesRepository;
import mth.repository.RolesmappingRepository;
import mth.repository.UsersRepository;

@SpringBootApplication
public class CoreservicesApplication {

	public static void main(String[] args) {
		SpringApplication.run(CoreservicesApplication.class, args);
	}

	@Bean
	CommandLineRunner seedData(
			UsersRepository usersRepository,
			RolesRepository rolesRepository,
			MenusRepository menusRepository,
			RolesmappingRepository rolesmappingRepository) {

		return args -> {

			// ── 1. Seed Roles ─────────────────────────────────────────────────────────
			Roles userRole = rolesRepository.findById(1L).orElseGet(() -> {
				Roles role = new Roles();
				role.setRole(1L);
				role.setRolename("USER");
				return rolesRepository.save(role);
			});

			Roles adminRole = rolesRepository.findById(99L).orElseGet(() -> {
				Roles role = new Roles();
				role.setRole(99L);
				role.setRolename("ADMIN");
				return rolesRepository.save(role);
			});

			// ── 2. Seed Menus ─────────────────────────────────────────────────────────
			seedMenu(menusRepository, 1L, "Overview",  "dashboard.png");
			seedMenu(menusRepository, 2L, "Plans",     "taskmanager.png");
			seedMenu(menusRepository, 3L, "Status",    "myprofile.png");

			// ── 3. Seed Role-Menu mappings ────────────────────────────────────────────
			// USER (role=1) can access Overview, Plans, Status
			seedMapping(rolesmappingRepository, userRole.getRole(), 1L);
			seedMapping(rolesmappingRepository, userRole.getRole(), 2L);
			seedMapping(rolesmappingRepository, userRole.getRole(), 3L);

			// ADMIN (role=99) can access all menus too
			seedMapping(rolesmappingRepository, adminRole.getRole(), 1L);
			seedMapping(rolesmappingRepository, adminRole.getRole(), 2L);
			seedMapping(rolesmappingRepository, adminRole.getRole(), 3L);

			// ── 4. Seed default Admin user ────────────────────────────────────────────
			Users adminUser = usersRepository.findByEmail("admin");
			if (adminUser == null) {
				adminUser = new Users();
			}
			adminUser.setFullname("Admin User");
			adminUser.setPhone("0000000000");
			adminUser.setEmail("admin");
			adminUser.setPassword("admin@123");
			adminUser.setRole(adminRole.getRole().intValue());
			adminUser.setStatus(1);
			usersRepository.save(adminUser);
		};
	}

	/** Insert a Menu row only if it does not already exist. */
	private void seedMenu(MenusRepository repo, Long mid, String name, String icon) {
		repo.findById(mid).orElseGet(() -> {
			Menus m = new Menus();
			m.setMid(mid);
			m.setMenu(name);
			m.setIcon(icon);
			return repo.save(m);
		});
	}

	/** Insert a Rolesmapping row only if it does not already exist. */
	private void seedMapping(RolesmappingRepository repo, Long role, Long mid) {
		RolesmappingId id = new RolesmappingId(role, mid);
		repo.findById(id).orElseGet(() -> {
			Rolesmapping rm = new Rolesmapping();
			rm.setRole(role);
			rm.setMid(mid);
			return repo.save(rm);
		});
	}
}
