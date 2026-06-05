package mth;

import org.springframework.boot.CommandLineRunner;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.context.annotation.Bean;

import mth.models.Roles;
import mth.models.Users;
import mth.repository.RolesRepository;
import mth.repository.UsersRepository;

@SpringBootApplication
public class CoreservicesApplication {

	public static void main(String[] args) {
		SpringApplication.run(CoreservicesApplication.class, args);
	}

	@Bean
	CommandLineRunner seedAdmin(UsersRepository usersRepository, RolesRepository rolesRepository) {
		return args -> {
			Roles adminRole = rolesRepository.findById(99L).orElseGet(() -> {
				Roles role = new Roles();
				role.setRole(99L);
				role.setRolename("ADMIN");
				return rolesRepository.save(role);
			});

			Users adminUser = (Users) usersRepository.findByEmail("admin");
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

}
