package mth.repository;

import java.util.List;

import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import mth.models.Users;

public interface UsersRepository extends JpaRepository<Users, Long> {

	@Query("select U.role from Users U where U.email=:username and U.password=:password")
	Object validateCredentials(@Param("username") String username, @Param("password") String password);

	@Query("select U.id from Users U where U.email=:email")
	Long checkByEmail(@Param("email") String email);

	@Query("select U from Users U where U.email=:email")
	Users findByEmail(@Param("email") String email);

	@Query("select M from Menus M join Rolesmapping R on M.mid=R.mid where R.role=:role order by M.mid")
	List<Object> getMenus(@Param("role") Long role);

	@Query("select U,R from Users U left join Roles R on U.role=R.role where U.email=:email")
	Object profileByEmail(@Param("email") String email);
}
